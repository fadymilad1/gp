class SecurityHeaderMiddleware:
    """
    Middleware to inject security headers (such as CSP) and strip/mask 
    sensitive server details to prevent version information leakage.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # 1. Set Content Security Policy (CSP)
        if 'Content-Security-Policy' not in response:
            if request.path.startswith('/admin/'):
                # More relaxed CSP for Django admin page to allow inline styles/scripts
                response['Content-Security-Policy'] = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data:; "
                    "object-src 'none'; "
                    "base-uri 'self'; "
                    "form-action 'self'; "
                    "frame-ancestors 'none';"
                )
            else:
                # Ultra-strict CSP for API and public endpoints
                response['Content-Security-Policy'] = (
                    "default-src 'self'; "
                    "object-src 'none'; "
                    "base-uri 'self'; "
                    "form-action 'self'; "
                    "frame-ancestors 'none';"
                )

        # 2. Mask the Server Header to prevent version disclosure
        response['Server'] = 'Protected'
        
        return response
