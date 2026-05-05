# Real-Time Time Tracking & Productivity Analytics


*COMPANY* : CODTECH IT SOLUTION

*NAME* : ABHISHEK KUMAR

*INTERN ID* : CTIS4271

*DOMAIN* : FULL STACK WEB DEVELOPMENT

*DURATION* : 16 WEEKS

*MENTOR* :NEELA SANTOSH KUMAR 

# Real-Time Time Tracking & Productivity Analytics

A comprehensive Chrome extension ecosystem for tracking productivity, classifying website usage, and providing detailed analytics to help users optimize their digital habits.

##  Features

- **Real-Time Tracking**: Automatically tracks time spent on websites and applications
- **Smart Categorization**: Classifies websites as Productive, Unproductive, or Neutral with customizable rules
- **Interactive Dashboard**: Beautiful React-based dashboard with charts and analytics
- **Weekly Reports**: Detailed weekly productivity reports with trends and insights
- **Cross-Platform Sync**: Seamless data synchronization between extension and dashboard
- **Privacy-Focused**: All data stored locally or in your own MongoDB instance

##  Architecture

This project consists of three main components:

- **`/extension`**: Manifest V3 Chrome Extension for real-time tracking
- **`/backend`**: Node.js/Express API with MongoDB for data storage and analytics
- **`/frontend-dashboard`**: React/Vite dashboard for visualization and management

##  Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Google Chrome browser

##  Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/productivity-tracker
JWT_SECRET=your-super-secret-jwt-key-here
```

Start the backend server:

```bash
npm start
```

The API will be available at `http://localhost:5000`.

### 2. Frontend Dashboard Setup

```bash
cd frontend-dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `/extension` folder from this project
5. Pin the extension to your toolbar for easy access

##  Usage

### Getting Started

1. **Create Account**: Visit the dashboard at `http://localhost:5173` and create an account
2. **Login**: Sign in to sync your session with the extension
3. **Start Browsing**: The extension will automatically begin tracking your activity

### Extension Features

- **Popup Dashboard**: Click the extension icon to view today's productivity breakdown
- **Real-Time Sync**: Data syncs every 30 seconds when active
- **Background Tracking**: Continues tracking even when Chrome is minimized

### Dashboard Features

- **Analytics Overview**: View daily and weekly productivity metrics
- **Interactive Charts**: Visualize time distribution across categories
- **Top Sites Report**: See which websites consume the most time
- **Custom Classification**: Manage website categories in Settings
- **Weekly Reports**: Generate and export productivity reports

##  API Endpoints

### Authentication
- `POST /api/login` - User authentication

### Tracking
- `POST /api/track` - Submit activity data
- `GET /api/analytics/today` - Get today's analytics
- `GET /api/analytics/weekly` - Get weekly analytics

### Classification
- `POST /api/classification` - Set website category
- `DELETE /api/classification/:id` - Remove custom classification
- `GET /api/classification` - Get all classifications

##  Deployment

### Backend Deployment (Render/Railway/Vercel)

1. Push the `/backend` folder to a GitHub repository
2. Connect to your preferred hosting service
3. Set environment variables:
   - `PORT`
   - `MONGODB_URI`
   - `JWT_SECRET`
4. Configure MongoDB Atlas network access to allow your hosting IP

### Frontend Dashboard Deployment (Vercel/Netlify)

1. Push the `/frontend-dashboard` folder to GitHub
2. Import project to Vercel/Netlify
3. Set build command: `npm run build`
4. Update API_URL in production code to point to deployed backend
5. Deploy

### Chrome Extension Deployment

1. Update `BACKEND_URL` in `background.js` and `popup.js` to production API URL
2. Zip the `/extension` folder
3. Upload to Chrome Web Store Developer Dashboard
4. Publish after review

## Security & Privacy

- JWT-based authentication
- Data encrypted in transit and at rest
- No third-party tracking or data sharing
- Self-hosted backend option for complete data control

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

##  Support

For issues and questions:
- Check the existing issues on GitHub
- Create a new issue with detailed information
- Include browser version, OS, and steps to reproduce

##  Acknowledgments

- Built with React, Express, and MongoDB
- Charts powered by Recharts
- UI styled with Tailwind CSS
- Icons from Lucide React

- ## Output
<img width="1918" height="877" alt="Image" src="https://github.com/user-attachments/assets/ef4fd8a9-fbf1-48b7-82f6-9e9c2905abff" />

<img width="1917" height="867" alt="Image" src="https://github.com/user-attachments/assets/3da0ab11-3c71-4548-8b21-9859964ac6fe" />

<img width="1913" height="871" alt="Image" src="https://github.com/user-attachments/assets/363c61da-4d33-4807-b847-1f27d4b6d105" />

<img width="1913" height="867" alt="Image" src="https://github.com/user-attachments/assets/58fcfba8-d37a-46c1-b977-df9a6717953a" />

<img width="1913" height="867" alt="Image" src="https://github.com/user-attachments/assets/4b087bbd-ed14-4255-9b19-e37967611c2e" />

<img width="1918" height="878" alt="Image" src="https://github.com/user-attachments/assets/31ae4888-fba4-4048-b8aa-65e69919ab86" />
