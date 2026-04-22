"""
Seed de datos demo para SIGAM.
Ejecutar: python -m app.shared.database.migrations.seed
"""
import asyncio
from decimal import Decimal
import app.shared.database.all_models  # noqa: F401 — registra todos los modelos SQLAlchemy
from app.shared.database.base import AsyncSessionLocal, engine, Base
from app.shared.security.hashing import hash_password
from app.apps.users.domain.models import User, Logia, MasonicDegree, UserStatus
from sqlalchemy import select
from app.apps.access.domain.models import NFCTag
from app.apps.finance.domain.models import FinancialConfig, Payment, PaymentStatus, ChargeType
from app.apps.documents.domain.models import Document, DocumentType, DocumentStatus


async def run_seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing_admin = await db.execute(select(User.id).where(User.email == "admin@sigam.mx"))
        if existing_admin.scalar_one_or_none():
            print("ℹ️ Seed omitido: datos demo ya existen")
            return

        # --- Logias ---
        chilam = Logia(name="Chilam Balam", number="3", city="Mérida, Yucatán")
        logia2 = Logia(name="Luz y Verdad", number="1", city="Ciudad de México")
        db.add_all([chilam, logia2])
        await db.flush()

        # --- Configuración financiera ---
        config_chilam = FinancialConfig(
            logia_id=chilam.id,
            rates={
                "iniciacion": "5000",
                "aumento": "3000",
                "exaltacion": "4000",
                "cuota": "500",
                "otro": "0",
            },
            gran_logia_split_percent=Decimal("30"),
        )
        db.add(config_chilam)

        # --- Usuarios del sistema (roles) ---
        admin = User(
            email="admin@sigam.mx",
            hashed_password=hash_password("Admin1234!"),
            full_name="Administrador Sistema",
            role="admin",
            logia_id=chilam.id,
            degree=MasonicDegree.MAESTRO,
        )
        secretaria = User(
            email="secretaria@sigam.mx",
            hashed_password=hash_password("Sec1234!"),
            full_name="Hermano Secretario",
            role="secretaria",
            logia_id=chilam.id,
            degree=MasonicDegree.MAESTRO,
        )
        tesorero = User(
            email="tesorero@sigam.mx",
            hashed_password=hash_password("Tes1234!"),
            full_name="Hermano Tesorero",
            role="tesorero",
            logia_id=chilam.id,
            degree=MasonicDegree.MAESTRO,
        )
        lector = User(
            email="lector@sigam.mx",
            hashed_password=hash_password("Lec1234!"),
            full_name="Hermano Lector",
            role="lector",
            logia_id=chilam.id,
            degree=MasonicDegree.APRENDIZ,
        )
        db.add_all([admin, secretaria, tesorero, lector])

        # --- Usuarios demo del brief ---
        alejandro = User(
            email="alex.m@email.com",
            hashed_password=hash_password("Demo1234!"),
            full_name="Alejandro Mendoza",
            role="lector",
            logia_id=chilam.id,
            degree=MasonicDegree.MAESTRO,
            whatsapp="+529991234567",
            status=UserStatus.ACTIVE,
        )
        carlos = User(
            email="carlos.r@email.com",
            hashed_password=hash_password("Demo1234!"),
            full_name="Carlos Ramírez",
            role="lector",
            logia_id=chilam.id,
            degree=MasonicDegree.COMPANERO,
            whatsapp="+529997654321",
            status=UserStatus.ACTIVE,
        )
        roberto = User(
            email="roberto.g@email.com",
            hashed_password=hash_password("Demo1234!"),
            full_name="Roberto Gómez",
            role="lector",
            logia_id=chilam.id,
            degree=MasonicDegree.APRENDIZ,
            whatsapp="+529991112233",
            status=UserStatus.ACTIVE,
        )
        db.add_all([alejandro, carlos, roberto])
        await db.flush()

        # --- Tags NFC ---
        tag_alejandro = NFCTag(uid="04:A1:B2:C3", user_id=alejandro.id)
        tag_carlos = NFCTag(uid="04:D4:E5:F6", user_id=carlos.id)
        tag_roberto = NFCTag(uid="04:G7:H8:I9", user_id=roberto.id)
        tag_admin = NFCTag(uid="04:AD:M1:N0", user_id=admin.id)
        db.add_all([tag_alejandro, tag_carlos, tag_roberto, tag_admin])

        # --- Roberto tiene adeudo (acceso DENEGADO en demo) ---
        adeudo_roberto = Payment(
            user_id=roberto.id,
            logia_id=chilam.id,
            charge_type=ChargeType.CUOTA,
            amount=Decimal("500"),
            amount_paid=Decimal("0"),
            status=PaymentStatus.PENDING,
            logia_amount=Decimal("350"),
            gran_logia_amount=Decimal("150"),
            notes="Cuota abril 2026",
        )
        # --- Alejandro y Carlos están al corriente ---
        pago_alejandro = Payment(
            user_id=alejandro.id,
            logia_id=chilam.id,
            charge_type=ChargeType.CUOTA,
            amount=Decimal("500"),
            amount_paid=Decimal("500"),
            status=PaymentStatus.PAID,
            logia_amount=Decimal("350"),
            gran_logia_amount=Decimal("150"),
        )
        pago_carlos = Payment(
            user_id=carlos.id,
            logia_id=chilam.id,
            charge_type=ChargeType.CUOTA,
            amount=Decimal("500"),
            amount_paid=Decimal("500"),
            status=PaymentStatus.PAID,
            logia_amount=Decimal("350"),
            gran_logia_amount=Decimal("150"),
        )
        db.add_all([adeudo_roberto, pago_alejandro, pago_carlos])

        # --- Documentos demo ---
        doc1 = Document(
            user_id=alejandro.id,
            logia_id=chilam.id,
            doc_type=DocumentType.TITULO,
            title="Título de Maestro — Alejandro Mendoza",
            unique_code="A1B2C3D4",
            status=DocumentStatus.APPROVED_GRAN_LOGIA,
        )
        doc2 = Document(
            user_id=carlos.id,
            logia_id=chilam.id,
            doc_type=DocumentType.CERTIFICADO,
            title="Certificado de Grado — Carlos Ramírez",
            unique_code="E5F6G7H8",
            status=DocumentStatus.APPROVED_LOGIA,
        )
        doc3 = Document(
            user_id=roberto.id,
            logia_id=chilam.id,
            doc_type=DocumentType.EXPEDIENTE,
            title="Expediente Digital — Roberto Gómez",
            unique_code="I9J0K1L2",
            status=DocumentStatus.PENDING,
        )
        db.add_all([doc1, doc2, doc3])

        await db.commit()
        print("\n✅ Seed completado exitosamente")
        print("\n📋 Credenciales del sistema:")
        print("  admin@sigam.mx / Admin1234!       → Administrador")
        print("  secretaria@sigam.mx / Sec1234!    → Secretaría")
        print("  tesorero@sigam.mx / Tes1234!      → Tesorero")
        print("  lector@sigam.mx / Lec1234!        → Lector")
        print("\n🎭 Usuarios demo del Presidente:")
        print("  alex.m@email.com / Demo1234!      → Alejandro Mendoza, Maestro [PAZ Y SALVO]")
        print("  carlos.r@email.com / Demo1234!    → Carlos Ramírez, Compañero [PAZ Y SALVO]")
        print("  roberto.g@email.com / Demo1234!   → Roberto Gómez, Aprendiz [CON ADEUDO]")
        print("\n📡 UIDs NFC para simular escaneo:")
        print("  04:A1:B2:C3 → Alejandro Mendoza  ✅ ACCESO PERMITIDO")
        print("  04:D4:E5:F6 → Carlos Ramírez      ✅ ACCESO PERMITIDO")
        print("  04:G7:H8:I9 → Roberto Gómez       ❌ ACCESO DENEGADO (adeudo)")


if __name__ == "__main__":
    asyncio.run(run_seed())
