from gestion_administrativa.authentication import JWTAuthentication


class JWTAuthenticationRubricas(JWTAuthentication):
    """
    Igual que JWTAuthentication, pero declara el header WWW-Authenticate para que
    DRF responda 401 (y no 403) cuando la petición llega sin token.
    """

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
