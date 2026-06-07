import React from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { PlantDetail } from "./pages/PlantDetail";
import { ConditionDetail } from "./pages/ConditionDetail";
import { CompoundDetail } from "./pages/CompoundDetail";
import { FamilyDetail } from "./pages/FamilyDetail";
import { KnowledgeGraph } from "./pages/KnowledgeGraph";
import { Chat } from "./pages/Chat";
import { Admin } from "./pages/Admin";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "plant/:id", Component: PlantDetail },
      { path: "condition/:id", Component: ConditionDetail },
      { path: "compound/:id", Component: CompoundDetail },
      { path: "family/:name", Component: FamilyDetail },
      { path: "graph", Component: KnowledgeGraph },
      { path: "chat", Component: Chat },
      { path: "admin", Component: Admin },
    ],
  },
]);
