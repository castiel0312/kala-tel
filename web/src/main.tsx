import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { WellsPage } from "./pages/WellsPage";
import { WellOverviewPage } from "./pages/WellOverviewPage";
import { TrajectoryPage } from "./pages/TrajectoryPage";
import { TimelinePage } from "./pages/TimelinePage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DataQualityPage } from "./pages/DataQualityPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./styles.css";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <WellsPage /> },
      { path: "/quality", element: <DataQualityPage /> },
      { path: "/wells/:wellId", element: <WellOverviewPage /> },
      { path: "/wells/:wellId/trajectory", element: <TrajectoryPage /> },
      { path: "/wells/:wellId/timeline", element: <TimelinePage /> },
      { path: "/wells/:wellId/events", element: <EventsPage /> },
      { path: "/wells/:wellId/documents", element: <DocumentsPage /> },
      { path: "/events/:eventId", element: <EventDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

const host = document.getElementById("root");
if (!host) throw new Error("#root not found");

createRoot(host).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
