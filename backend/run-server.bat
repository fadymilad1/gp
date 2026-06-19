@echo off
echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Running database migrations...
python manage.py migrate

echo.
echo Starting Django development server...
python manage.py runserver 0.0.0.0:8000
