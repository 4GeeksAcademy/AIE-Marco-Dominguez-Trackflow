import IncidentAnalysis from "@/app/components/incident-analysis";
import IncidentManager from "@/app/components/incident-manager";

export default function IncidentsPage() {
  return (
    <>
      <IncidentManager />
      <IncidentAnalysis />
    </>
  );
}
