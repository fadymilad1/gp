from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny # For demo purposes, we can allow any or IsAuthenticated
from rest_framework import status
from rag_model.services.rag_service import ask_rag

class RAGAskView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        query = request.data.get('question') or request.data.get('message') or request.data.get('query')
        if not query:
            return Response({'error': 'question field is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        result = ask_rag(query)
        return Response(result, status=status.HTTP_200_OK)
