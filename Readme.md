# SkillMint

SkillMint is an AI-powered course builder and learning platform. It allows users to generate high-quality, structured online courses on any topic using LLMs, complete with lessons, quizzes, and curated YouTube videos. The platform is built with a modern React frontend, FastAPI backend, and Supabase for data storage.

---

## Features

- **AI Course Generation:** Instantly generate a full course outline and detailed lessons on any topic using LLMs.
- **Lesson Content:** Each lesson is formatted with Markdown for readability and clarity.
- **Quizzes:** Auto-generated multiple-choice quizzes for every lesson to reinforce learning.
- **YouTube Integration:** Fetches and filters high-quality educational videos from trusted channels for each lesson.
- **Progress Tracking:** Track your learning progress through lessons and quizzes.
- **User Authentication:** Secure sign-in and personalized course management.
- **Responsive UI:** Modern, clean, and mobile-friendly interface.

---

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, React Router
- **Backend:** FastAPI, Python, httpx
- **Database:** Supabase (PostgreSQL)
- **AI/LLM:** Configurable LLM endpoint (OpenAI, Ollama, etc.)
- **YouTube API:** For fetching and filtering educational videos

---

## Getting Started

Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Supabase account & project
- YouTube Data API key
- LLM endpoint (OpenAI, Ollama, etc.)

---

### Setup

1. Clone the repository

```sh
git clone https://github.com/Suryavedha99/SkillMint.git
cd SkillMint
```

2. Environment Variables

```sh
Create .env files in both frontend/ and backend/ directories with the following keys:

Frontend (frontend/.env):
VITE_BACKEND_URL=http://localhost:8000

Backend (backend/.env):
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
YOUTUBE_API_KEY=your_youtube_api_key
LLM_URL=your_llm_endpoint_url
LLM_MODEL=your_llm_model_name
```

3. Install Dependencies

```sh
Frontend:
cd frontend
npm install

Backend:
cd ../backend
pip install -r requirements.txt
```

4. Run the App

```sh
Start Supabase (if using locally):
supabase start

Backend:
uvicorn backend.main:app --reload

Frontend:
cd frontend
npm run dev
```

---

### Folder Structure

```sh
SkillMint_Final/
├── backend/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── index.css
│   └── public/
└── [Readme.md]

```
---

### Customization

LLM Provider: You can configure any LLM endpoint by setting LLM_URL and LLM_MODEL in the backend .env.
YouTube Filtering: Preferred channels and filtering logic can be adjusted in backend/services/youtube_service.py.
Styling: Tweak Tailwind and Shadcn UI classes in the frontend for a custom look.

---

### Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

### License
© 2025 Suryavedha Pradhan. This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
