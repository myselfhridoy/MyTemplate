import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MathJaxContext } from 'better-react-mathjax';
import Navbar from './Components/Navbar/Navbar';
import Dashboard from './Pages/Dashboard/Dashboard';
import LoginPage from './Pages/LoginPage';
import ProfilePage from './Pages/ProfilePage';
import NewsFeedPage from './Pages/NewsFeedPage';
import ToolsPage from './Pages/ToolsPage';
import AdminPage from './Pages/AdminPage';
import AttendancePage from './Pages/AttendancePage';
import RoutinePage from './Pages/RoutinePage';
import BoardCQPage from './Pages/BoardCQPage';
import CreativeCQPage from './Pages/CreativeCQPage';
import BookContentPage from './Pages/BookContentPage';
import ChapterPDFPage from './Pages/ChapterPDFPage';
import SelfTestPage from './Pages/SelfTestPage';
import ChatPDFPage from './Pages/ChatPDFPage';
import DesmosGraphPage from './Pages/DesmosGraphPage';
import AIModelsPage from './Pages/AIModelsPage';
import UnifiedAIPage from './Components/AI/UnifiedAIPage';
import { AI_MODELS } from './Components/AI/ai-models';
import PuterChatPage from './Pages/PuterChatPage';
import PrivacyPolicy from './Pages/PrivacyPolicy';
import TermsOfService from './Pages/TermsOfService';
import { AuthProvider } from './Context/AuthContext';
import PrivateRoute from './Components/PrivateRoute';
import AdminRoute from './Components/AdminRoute';

const mathJaxConfig = {
  loader: { load: ['input/tex', 'output/chtml', '[tex]/textmacros'] },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
  },
  chtml: { displayAlign: 'left', displayIndent: '0em', scale: 1.1, mtextInheritFont: true },
  options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
};

export default function App() {
  return (
    <MathJaxContext config={mathJaxConfig}>
      <AuthProvider>
        <Navbar />
        <main className="ios-app-main">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/routine" element={<PrivateRoute><RoutinePage /></PrivateRoute>} />
            <Route path="/newsfeed" element={<PrivateRoute><NewsFeedPage /></PrivateRoute>} />
            <Route path="/tools" element={<PrivateRoute><ToolsPage /></PrivateRoute>} />
            <Route path="/board-cq" element={<PrivateRoute><BoardCQPage /></PrivateRoute>} />
            <Route path="/desmos-graph" element={<PrivateRoute><DesmosGraphPage /></PrivateRoute>} />
            <Route path="/ai-chatbot" element={<PrivateRoute><PuterChatPage /></PrivateRoute>} />

            <Route path="/ai-models" element={<PrivateRoute><AIModelsPage /></PrivateRoute>} />
            {Object.keys(AI_MODELS).map((id) => (
              <Route
                key={id}
                path={`/ai/${id}`}
                element={<PrivateRoute><UnifiedAIPage modelId={id} /></PrivateRoute>}
              />
            ))}

            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/attendance" element={<AdminRoute><AttendancePage /></AdminRoute>} />
            <Route path="/creative-cq" element={<AdminRoute><CreativeCQPage /></AdminRoute>} />
            <Route path="/bookcontent" element={<AdminRoute><BookContentPage /></AdminRoute>} />
            <Route path="/chapter-pdf" element={<AdminRoute><ChapterPDFPage /></AdminRoute>} />
            <Route path="/selftest/*" element={<AdminRoute><SelfTestPage /></AdminRoute>} />
            <Route path="/chatpdf" element={<AdminRoute><ChatPDFPage /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </MathJaxContext>
  );
}
