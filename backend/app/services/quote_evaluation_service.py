from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.supplier import Supplier
from app.models.supplier_quote import SupplierQuote
from app.models.supplier_quote_item import SupplierQuoteItem
from app.schemas.quote_evaluation import (
    QuoteEvaluationResponse,
    QuoteEvaluationResult,
)


TECHNICAL_WEIGHT = Decimal("25")
QUALITY_WEIGHT = Decimal("15")
DELIVERY_WEIGHT = Decimal("25")
COMMERCIAL_WEIGHT = Decimal("35")


def calculate_delivery_score(
    days_early_or_late: int,
) -> Decimal:
    """
    Calculate delivery score from schedule buffer.

    Positive = days early
    Zero     = exactly on required date
    Negative = days late
    """

    if days_early_or_late < 0:
        return Decimal("0")

    if days_early_or_late >= 30:
        return Decimal("100")

    return (
        Decimal(days_early_or_late)
        / Decimal("30")
        * Decimal("100")
    ).quantize(Decimal("0.01"))


def calculate_commercial_score(
    landed_cost: Decimal,
    lowest_landed_cost: Decimal,
) -> Decimal:

    if landed_cost <= 0:
        return Decimal("0")

    if lowest_landed_cost <= 0:
        return Decimal("0")

    score = (
        lowest_landed_cost
        / landed_cost
        * Decimal("100")
    )

    return score.quantize(Decimal("0.01"))


def evaluate_quotes(
    db: Session,
    rfq_id: UUID,
) -> QuoteEvaluationResponse:

    # ---------------------------------------------------------
    # 1. Find RFQ
    # ---------------------------------------------------------

    rfq = db.scalar(
        select(RFQ).where(
            RFQ.id == rfq_id
        )
    )

    if not rfq:
        raise ValueError(
            f"RFQ not found: {rfq_id}"
        )

    # ---------------------------------------------------------
    # 2. Find RFQ items
    # ---------------------------------------------------------

    rfq_items = db.scalars(
        select(RFQItem).where(
            RFQItem.rfq_id == rfq_id
        )
    ).all()

    if not rfq_items:
        raise ValueError(
            f"RFQ {rfq.rfq_number} has no items."
        )

    # Version 1 assumes one RFQ item.
    if len(rfq_items) > 1:
        raise ValueError(
            "Quote evaluation currently supports one RFQ item."
        )

    rfq_item = rfq_items[0]

    # ---------------------------------------------------------
    # 3. Get supplier quotes
    # ---------------------------------------------------------

    quotes = db.scalars(
        select(SupplierQuote).where(
            SupplierQuote.rfq_id == rfq_id,
            SupplierQuote.status == "RECEIVED",
        )
    ).all()

    if not quotes:
        raise ValueError(
            f"No received supplier quotes found for "
            f"RFQ {rfq.rfq_number}."
        )

    # ---------------------------------------------------------
    # 4. Required date
    # ---------------------------------------------------------

    procurement_request = None

    from app.models.procurement_request import ProcurementRequest
    from app.models.procurement_request_item import (
        ProcurementRequestItem,
    )

    procurement_request_item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id
            == rfq_item.procurement_request_item_id
        )
    )

    if not procurement_request_item:
        raise ValueError(
            "Procurement request item linked to RFQ was not found."
        )

    procurement_request = db.scalar(
        select(ProcurementRequest).where(
            ProcurementRequest.id
            == procurement_request_item.procurement_request_id
        )
    )

    if not procurement_request:
        raise ValueError(
            "Procurement request linked to RFQ was not found."
        )

    required_date = procurement_request.required_date

    # ---------------------------------------------------------
    # 5. Evaluate each quote
    # ---------------------------------------------------------

    raw_results = []

    for quote in quotes:

        quote_item = db.scalar(
            select(SupplierQuoteItem).where(
                SupplierQuoteItem.supplier_quote_id
                == quote.id,
                SupplierQuoteItem.rfq_item_id
                == rfq_item.id,
            )
        )

        if not quote_item:
            continue

        supplier = db.scalar(
            select(Supplier).where(
                Supplier.id == quote.supplier_id
            )
        )

        if not supplier:
            continue

        quantity = Decimal(str(quote_item.quantity))
        unit_price = Decimal(str(quote_item.unit_price))

        material_value = quantity * unit_price

        freight = Decimal(str(quote.freight_cost))
        insurance = Decimal(str(quote.insurance_cost))
        tax = Decimal(str(quote.tax_cost))

        landed_cost = (
            material_value
            + freight
            + insurance
            + tax
        )

        lead_time_days = quote_item.lead_time_days or 0

        expected_delivery_date = (
            rfq.issue_date
            + timedelta(days=lead_time_days)
        )

        days_early_or_late = (
            required_date - expected_delivery_date
        ).days

        meets_required_date = (
            days_early_or_late >= 0
        )

        technical_score = (
            Decimal("100")
            if quote_item.technical_compliance
            else Decimal("0")
        )

        quality_score = (
            Decimal("100")
            if quote_item.quality_compliance
            else Decimal("0")
        )

        delivery_score = calculate_delivery_score(
            days_early_or_late
        )

        raw_results.append(
            {
                "quote": quote,
                "quote_item": quote_item,
                "supplier": supplier,
                "quantity": quantity,
                "unit_price": unit_price,
                "material_value": material_value,
                "freight": freight,
                "insurance": insurance,
                "tax": tax,
                "landed_cost": landed_cost,
                "lead_time_days": lead_time_days,
                "expected_delivery_date": expected_delivery_date,
                "days_early_or_late": days_early_or_late,
                "meets_required_date": meets_required_date,
                "technical_score": technical_score,
                "quality_score": quality_score,
                "delivery_score": delivery_score,
            }
        )

    if not raw_results:
        raise ValueError(
            "No valid quote line items found."
        )

    # ---------------------------------------------------------
    # 6. Find lowest compliant landed cost
    # ---------------------------------------------------------

    compliant_results = [
        result
        for result in raw_results
        if (
            result["quote_item"].technical_compliance
            and result["quote_item"].quality_compliance
            and result["meets_required_date"]
        )
    ]

    if compliant_results:
        lowest_landed_cost = min(
            result["landed_cost"]
            for result in compliant_results
        )
    else:
        lowest_landed_cost = min(
            result["landed_cost"]
            for result in raw_results
        )

    # ---------------------------------------------------------
    # 7. Build final evaluation
    # ---------------------------------------------------------

    results = []

    for result in raw_results:

        commercial_score = calculate_commercial_score(
            result["landed_cost"],
            lowest_landed_cost,
        )

        overall_score = (
            result["technical_score"]
            * TECHNICAL_WEIGHT
            / Decimal("100")
            +
            result["quality_score"]
            * QUALITY_WEIGHT
            / Decimal("100")
            +
            result["delivery_score"]
            * DELIVERY_WEIGHT
            / Decimal("100")
            +
            commercial_score
            * COMMERCIAL_WEIGHT
            / Decimal("100")
        ).quantize(Decimal("0.01"))

        flags = []

        if not result["quote_item"].technical_compliance:
            flags.append(
                "Technical non-compliance."
            )

        if not result["quote_item"].quality_compliance:
            flags.append(
                "Quality non-compliance."
            )

        if not result["meets_required_date"]:
            flags.append(
                "Supplier delivery does not meet required date."
            )

        if result["landed_cost"] > lowest_landed_cost:
            flags.append(
                "Higher landed cost than the lowest evaluated quote."
            )

        eligible = (
            result["quote_item"].technical_compliance
            and result["quote_item"].quality_compliance
            and result["meets_required_date"]
        )

        results.append(
            QuoteEvaluationResult(
                quote_id=result["quote"].id,
                supplier_id=result["supplier"].id,
                supplier_code=result["supplier"].supplier_code,
                supplier_name=result["supplier"].supplier_name,
                quoted_quantity=result["quantity"],
                unit_price=result["unit_price"],
                material_value=result["material_value"],
                freight_cost=result["freight"],
                insurance_cost=result["insurance"],
                tax_cost=result["tax"],
                landed_cost=result["landed_cost"],
                lead_time_days=result["lead_time_days"],
                expected_delivery_date=str(
                    result["expected_delivery_date"]
                ),
                required_date=str(required_date),
                days_early_or_late=result["days_early_or_late"],
                meets_required_date=result["meets_required_date"],
                technical_compliance=(
                    result["quote_item"].technical_compliance
                ),
                quality_compliance=(
                    result["quote_item"].quality_compliance
                ),
                payment_terms=result["quote"].payment_terms,
                incoterm=result["quote"].incoterm,
                technical_score=result["technical_score"],
                quality_score=result["quality_score"],
                delivery_score=result["delivery_score"],
                commercial_score=commercial_score,
                overall_score=overall_score,
                eligible_for_recommendation=eligible,
                evaluation_flags=flags,
            )
        )

    return QuoteEvaluationResponse(
        rfq_id=rfq.id,
        rfq_number=rfq.rfq_number,
        required_date=str(required_date),
        evaluated_quote_count=len(results),
        results=results,
    )