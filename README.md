# Rawnak Sales - A Firebase Studio Project

This is a Next.js starter project for a Sales Management System, built in Firebase Studio.

## Getting Started

To run the project locally, you need to set up your environment variables for Firebase.

1.  **Copy the example environment file:**
    ```bash
    cp .env.example .env
    ```

2.  **Create a Firebase Project:**
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Create a new project.
    - In your project, go to **Project settings** > **General**.
    - Under "Your apps", click the web icon (`</>`) to register a new web app.
    - After registering, you will see your Firebase configuration keys.

3.  **Populate your `.env` file:**
    - Open the `.env` file you created in step 1.
    - Copy the configuration values from your Firebase project settings into the corresponding variables in the `.env` file.

4.  **Install dependencies and run the development server:**
    ```bash
    npm install
    npm run dev
    ```

The app should now be running on `http://localhost:9002` and connected to your Firebase project.
