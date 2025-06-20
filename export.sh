#!/bin/bash

FILE="work.log"
NUM_COMMITS=40

# Liste de messages réalistes
commit_messages=(
  "feat(auth): implement JWT-based login authentication

Added a middleware to verify tokens and updated the login route to return a JWT. This will allow secure and stateless user sessions."
  
  "fix(ui): correct broken layout on mobile devices

The sidebar was overflowing on screens smaller than 400px. Applied flex-wrap and adjusted padding to resolve the issue."

  "docs(readme): update installation instructions and prerequisites

Added missing dependencies and clarified Node.js version requirement to avoid common setup issues."

  "refactor(user-service): extract email validation to utility function

Moved the email validation logic to a separate reusable module to keep the service cleaner and more maintainable."

  "chore(deps): upgrade express to v4.18.2 and fix breaking changes

Updated affected route handlers and middleware registration to be compatible with the latest version of Express."

  "feat(profile): allow users to upload avatar images

Integrated file upload using multer and added an endpoint for uploading profile pictures. Files are now stored in /uploads."

  "fix(api): handle null values in query parameters

Previously, null query values caused SQL errors. Now these parameters are sanitized and properly defaulted."

  "style(css): unify button styles across pages

Standardized all primary and secondary buttons to follow the same style guide. Removed inline styles."

  "perf(db): add index to 'email' column on 'users' table

Improved lookup performance on login and password reset endpoints by adding an index to the email column."

  "test(api): add integration tests for registration endpoint

Covered happy path, duplicate user registration, and invalid input scenarios using supertest and Jest."

  "feat(notifications): implement real-time notifications with Socket.IO

Added server-side socket logic and frontend listener to display real-time alerts when a new message is received."

  "fix(router): prevent 404 on hard refresh in SPA mode

Added fallback to index.html using Express static middleware configuration to support client-side routing."

  "docs(api): generate OpenAPI spec for all endpoints

Created a Swagger UI interface at /docs using swagger-jsdoc and swagger-ui-express."

  "refactor(auth): move token logic to separate service file

This separates concerns and improves testability for the login and token refresh logic."

  "chore(cleanup): remove deprecated endpoints and unused code

Deleted old `/v1` routes and cleaned up legacy functions that are no longer used in production."

  "feat(settings): add user preference saving for dark mode

Stored dark mode preference in localStorage and applied corresponding CSS class on page load."

  "fix(security): sanitize user inputs to prevent XSS

Used DOMPurify to clean user-generated content before rendering it in the chat window."

  "test(helpers): add unit tests for date formatting utilities

Covered edge cases for invalid dates, timezone offsets, and daylight savings adjustments."

  "perf(api): reduce payload size by excluding unused fields

Updated serializers to exclude verbose fields like `created_at` and `updated_at` from API responses."

  "style(lint): fix ESLint and Prettier warnings across entire codebase

Ran auto-fix and manual updates to ensure consistency and adherence to code style."
)


# Crée le fichier s'il n'existe pas
touch $FILE

echo "📦 Démarrage de la série de commits réalistes..."

for i in $(seq 1 $NUM_COMMITS)
do
    # Sélection aléatoire d'un message
    msg=${commit_messages[$RANDOM % ${#commit_messages[@]}]}

    # Simule une modification "réelle"
    echo "$(date): $msg" >> $FILE

    # Git add + commit avec le message réaliste
    git add $FILE
    git commit -m "$msg"

    # Optionnel : petite pause
    sleep 0.4
done
