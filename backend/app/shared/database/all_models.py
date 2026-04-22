# Importar todos los modelos para que SQLAlchemy resuelva las relaciones entre módulos
from app.apps.users.domain.models import User, Logia, RefreshToken  # noqa: F401
from app.apps.access.domain.models import NFCTag, AccessEvent  # noqa: F401
from app.apps.finance.domain.models import FinancialConfig, Payment  # noqa: F401
from app.apps.documents.domain.models import Document  # noqa: F401
