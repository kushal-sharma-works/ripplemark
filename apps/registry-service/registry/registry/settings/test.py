from registry.settings.base import *

DEBUG = False
DATABASES = {
    "default": env.db("DATABASE_URL", default="sqlite:///:memory:")
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
