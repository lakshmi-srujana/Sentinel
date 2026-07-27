from fastapi import Depends, HTTPException, status
from app.db.models import User, RoleEnum
from app.auth.jwt import get_current_user

def require_roles(*roles: RoleEnum):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}"
            )
        return current_user
    return checker

require_employee = require_roles(RoleEnum.employee, RoleEnum.manager, RoleEnum.hr, RoleEnum.admin)
require_manager  = require_roles(RoleEnum.manager, RoleEnum.admin)
require_hr       = require_roles(RoleEnum.hr, RoleEnum.admin)
require_admin    = require_roles(RoleEnum.admin)