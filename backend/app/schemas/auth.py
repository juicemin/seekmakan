from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
)

class LoginRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        hide_input_in_errors=True,
    )

    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)

class RegisterRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        hide_input_in_errors=True,
    )

    display_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: SecretStr = Field(min_length=10, max_length=128)

    @field_validator("display_name", mode="before")
    @classmethod
    def trim_display_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("password")
    @classmethod
    def reject_password_whitespace(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()

        if any(character.isspace() for character in password):
            raise ValueError("Password must not contain spaces or other whitespace.")

        return value

class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        hide_input_in_errors=True,
    )

    token: str = Field(
        min_length=43,
        max_length=43,
        pattern=r"^[A-Za-z0-9_-]+$",
    )

class ResendVerificationRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        hide_input_in_errors=True,
    )

    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        hide_input_in_errors=True,
    )

    email: EmailStr

class ResetPasswordRequest(VerifyEmailRequest):
    new_password: SecretStr = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def reject_password_whitespace(cls, value: SecretStr) -> SecretStr:
        if any(character.isspace() for character in value.get_secret_value()):
            raise ValueError(
                "Password must not contain spaces or other whitespace."
            )

        return value