
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.material import Material
from app.models.project import Project

router = APIRouter(tags=["Catalog"])


@router.get("/projects")
def list_projects(
    db: Session = Depends(get_db),
):
    projects = db.scalars(
        select(Project).order_by(Project.project_name.asc())
    ).all()

    return [
        {
            "id": str(project.id),
            "project_code": project.project_code,
            "project_name": project.project_name,
            "country_id": str(project.country_id),
            "project_manager": project.project_manager,
            "status": project.status,
            "start_date": (
                project.start_date.isoformat()
                if project.start_date else None
            ),
            "end_date": (
                project.end_date.isoformat()
                if project.end_date else None
            ),
        }
        for project in projects
    ]


@router.get("/materials")
def list_materials(
    db: Session = Depends(get_db),
):
    materials = db.scalars(
        select(Material)
        .where(Material.is_active.is_(True))
        .order_by(Material.material_name.asc())
    ).all()

    return [
        {
            "id": str(material.id),
            "material_code": material.material_code,
            "material_name": material.material_name,
            "category": material.category,
            "description": material.description,
            "base_uom": material.base_uom,
            "is_active": material.is_active,
        }
        for material in materials
    ]
