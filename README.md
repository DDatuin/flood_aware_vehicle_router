# Route Optimizer – Setup Guide

This project provides a route optimization service using OpenRouteService (ORS).  
Follow the steps below to set up your local environment and run the application.

## Requirements
- Python 3.11 
- A valid [OpenRouteService API key](https://openrouteservice.org/dev/#/signup)

### 1. Download a copy of the codebase or clone the repository using Git or Github
### 2. Create your own Virtual Environment
  - Open your terminal in VSCode and go to your clone copy of this codebase then type:
  ``` 
  python -m venv .venv
  ```
### 3. Activate your Virtual Environment
  - Type the following command so that the virtual environment will be used for the server:
  ```
  .venv\Scripts\Activate
  ```
### 4. Install the necessary dependencies
  - In your terminal, type the following command to install the dependencies used in the project:
  ```
  pip install -r requirements.txt
  ```

### 5. Run the Flask App
- In your terminal again, type the following command to run the app.py file:
  ```
  python app.py
  ```
  Once the server is running, you can access the frontend through the link presented in the terminal.
