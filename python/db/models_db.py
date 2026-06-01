from sqlalchemy import Boolean, Column, Float, Integer, String, Text

from db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)


class RoomState(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    floor = Column(Integer)
    room_type = Column(String)
    status = Column(String)
    last_cleaned = Column(Float)
    proximity = Column(String)


class GuestRecord(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True)
    guest_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    room_number = Column(String)
    check_in_date = Column(Float)
    check_out_date = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)


class OrderRecord(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_id = Column(String, unique=True, index=True, nullable=False)
    room_number = Column(String)
    items_json = Column(Text)
    status = Column(String)
    total_price = Column(Float)
    created_at = Column(Float)


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True)
    request_id = Column(String, unique=True, index=True, nullable=False)
    room_number = Column(String)
    priority = Column(String)
    description = Column(Text)
    status = Column(String, default="OPEN")
    assigned_to = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(Float)
