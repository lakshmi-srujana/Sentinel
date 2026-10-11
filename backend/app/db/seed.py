from passlib.context import CryptContext
from app.db.database import SessionLocal, create_tables
from app.db.models import User, RoleEnum

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {
        "email": "employee@sentinel.ai",
        "username": "employee",
        "password": "Password123!",
        "role": RoleEnum.employee,
        "department": "Engineering",
        "org_id": "org_default"
    },
    {
        "email": "manager@sentinel.ai",
        "username": "manager",
        "password": "Password123!",
        "role": RoleEnum.manager,
        "department": "Engineering",
        "org_id": "org_default"
    },
    {
        "email": "hr@sentinel.ai",
        "username": "hr",
        "password": "Password123!",
        "role": RoleEnum.hr,
        "department": "People Ops",
        "org_id": "org_default"
    },
    {
        "email": "admin@sentinel.ai",
        "username": "admin",
        "password": "Password123!",
        "role": RoleEnum.admin,
        "department": "Security",
        "org_id": "org_default"
    }
]

def seed_database():
    create_tables()
    db = SessionLocal()
    try:
        created = 0
        for u_data in DEMO_USERS:
            existing = db.query(User).filter((User.email == u_data["email"]) | (User.username == u_data["username"])).first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    username=u_data["username"],
                    hashed_pw=pwd_ctx.hash(u_data["password"]),
                    role=u_data["role"],
                    department=u_data["department"],
                    org_id=u_data["org_id"]
                )
                db.add(user)
                created += 1
        db.commit()
        print(f"Seed complete: {created} new demo users created.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
