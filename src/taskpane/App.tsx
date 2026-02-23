import React, { useState } from "react";
import {
  FluentProvider,
  webLightTheme,
  Tab,
  TabList,
} from "@fluentui/react-components";
import { CorrectionTab } from "./components/CorrectionTab";
import { ProofreadTab } from "./components/ProofreadTab";
import { SourcesTab } from "./components/SourcesTab";
import { StyleTab } from "./components/StyleTab";
import { SuggestionsTab } from "./components/SuggestionsTab";
import { SettingsTab } from "./components/SettingsTab";

export default function App() {
  const [tab, setTab] = useState("correction");

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: 8 }}>
        <h2 style={{ margin: "8px 0", fontSize: 16 }}>SchreibAssistent Pro</h2>
        <TabList
          size="small"
          selectedValue={tab}
          onTabSelect={(_, d) => setTab(d.value as string)}
        >
          <Tab value="correction">Korrektur</Tab>
          <Tab value="proofread">Lektorat</Tab>
          <Tab value="sources">Quellen</Tab>
          <Tab value="style">Stil</Tab>
          <Tab value="suggestions">Vorschläge</Tab>
          <Tab value="settings">&#9881;</Tab>
        </TabList>
        <div style={{ marginTop: 12 }}>
          {tab === "correction" && <CorrectionTab />}
          {tab === "proofread" && <ProofreadTab />}
          {tab === "sources" && <SourcesTab />}
          {tab === "style" && <StyleTab />}
          {tab === "suggestions" && <SuggestionsTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </div>
    </FluentProvider>
  );
}
