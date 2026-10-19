from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.services.procurement_orchestrator.nodes import (
    create_rfq_node,
    finalize_orchestration_node,
    load_request_node,
    quote_analysis_node,
    sourcing_decision_node,
    supplier_eligibility_node,
    supply_analysis_node,
)

from app.services.procurement_orchestrator.state import (
    ProcurementState,
)


def build_procurement_graph(db: Session):
    graph = StateGraph(ProcurementState)

    def load_request(state):
        return load_request_node(
            state=state,
            db=db,
        )

    def supply_analysis(state):
        return supply_analysis_node(
            state=state,
            db=db,
        )

    def supplier_eligibility(state):
        return supplier_eligibility_node(
            state=state,
            db=db,
        )

    def sourcing_decision(state):
        return sourcing_decision_node(
            state=state,
            db=db,
        )

    def create_rfq(state):
        return create_rfq_node(
            state=state,
            db=db,
        )

    def quote_analysis(state):
        return quote_analysis_node(
            state=state,
            db=db,
        )

    def finalize(state):
        return finalize_orchestration_node(
            state=state,
            db=db,
        )

    # ---------------------------------------------------------
    # Nodes
    # ---------------------------------------------------------

    graph.add_node(
        "load_request",
        load_request,
    )

    graph.add_node(
        "supply_analysis",
        supply_analysis,
    )

    graph.add_node(
        "supplier_eligibility",
        supplier_eligibility,
    )

    graph.add_node(
        "sourcing_decision",
        sourcing_decision,
    )

    graph.add_node(
        "create_rfq",
        create_rfq,
    )

    graph.add_node(
        "quote_analysis",
        quote_analysis,
    )

    graph.add_node(
        "finalize",
        finalize,
    )

    # ---------------------------------------------------------
    # Flow
    # ---------------------------------------------------------

    graph.add_edge(
        START,
        "load_request",
    )

    graph.add_edge(
        "load_request",
        "supply_analysis",
    )

    graph.add_edge(
        "supply_analysis",
        "supplier_eligibility",
    )

    graph.add_edge(
        "supplier_eligibility",
        "sourcing_decision",
    )

    # IMPORTANT:
    # RFQ must be created before quote analysis.
    graph.add_edge(
        "sourcing_decision",
        "create_rfq",
    )

    graph.add_edge(
        "create_rfq",
        "quote_analysis",
    )

    graph.add_edge(
        "quote_analysis",
        "finalize",
    )

    graph.add_edge(
        "finalize",
        END,
    )

    return graph.compile()