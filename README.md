

  ## Running the code

  The UI (port 5173) needs the **FastAPI backend** on port **8000**. If only the frontend is running, you will see `Failed to fetch` / `ERR_CONNECTION_REFUSED`.

  ### 1. Install dependencies

  ```bash
  npm install
  npm run setup:backend
  ```

  ### 2. Data (CSV → SQLite)

  On first start the backend builds `backend/omani_ethno.db` from a CSV. Use either:

  - Full dataset: copy `Oman_Ethnomedicinal_Merged.csv` to `backend/data/` (download from [PlantMedOman](https://omanmedicinalplant.om/)), or
  - Dev sample: `backend/data/Oman_Ethnomedicinal_Merged.sample.csv` (included; limited plants)

  Override path: `OMAN_ETHNO_CSV=C:\path\to\file.csv`

  ### 3. Start both servers

  **Terminal A — backend:**

  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  npm run dev:backend
  ```

  **Terminal B — frontend:**

  ```powershell
  npm run dev
  ```

  Or on Windows: `.\start.ps1` (starts backend in a new window, then frontend).

  - Frontend: http://localhost:5173
  - API docs: http://localhost:8000/docs

  ### Chat

  The chatbot uses the **Gemini API** for answer generation (default model `gemini-2.5-flash`). Set `GEMINI_API_KEY` in `.env` (free key at [Google AI Studio](https://aistudio.google.com/apikey)). Optional: `GEMINI_MODEL`.

  ### Admin panel

  Open **Admin** in the nav (or http://localhost:5173/admin) to manage the SQLite database: add/edit/delete rows, add columns, and rebuild the knowledge graph after changes.

  Set `ADMIN_PASSWORD` in `.env` (default for local dev: `admin`). The panel is disabled if this variable is empty.

  **Plant images:** In Admin → **Plants**, drag and drop an image onto the `image_url` cell (or click to browse). Images are stored under `backend/uploads/plants/` and shown on each plant profile page.
  
