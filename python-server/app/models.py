from enum import Enum
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Role(str, Enum):
    ADMIN = "ADMIN"
    AGENT = "AGENT"


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketCategory(str, Enum):
    GENERAL_QUESTION = "GENERAL_QUESTION"
    TECHNICAL_QUESTION = "TECHNICAL_QUESTION"
    REFUND_QUESTION = "REFUND_QUESTION"


class User(SQLModel, table=True):
    __tablename__ = "User"

    id: str = Field(primary_key=True)
    name: str
    email: str = Field(unique=True)
    password: str
    role: Role = Field(default=Role.AGENT, sa_type_kwargs={"name": "Role"})
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class Session(SQLModel, table=True):
    __tablename__ = "Session"

    id: str = Field(primary_key=True)
    userId: str = Field(foreign_key="User.id")
    expiresAt: datetime
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class Ticket(SQLModel, table=True):
    __tablename__ = "Ticket"

    id: str = Field(primary_key=True)
    subject: str
    body: str
    senderEmail: str
    senderName: Optional[str] = None
    status: TicketStatus = Field(
        default=TicketStatus.OPEN, sa_type_kwargs={"name": "TicketStatus"}
    )
    category: Optional[TicketCategory] = Field(
        default=None, sa_type_kwargs={"name": "TicketCategory"}
    )
    aiSummary: Optional[str] = None
    assignedToId: Optional[str] = Field(default=None, foreign_key="User.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class Reply(SQLModel, table=True):
    __tablename__ = "Reply"

    id: str = Field(primary_key=True)
    body: str
    ticketId: str = Field(foreign_key="Ticket.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
