import { AlertTriangle } from "lucide-react";

export function TimeDisclaimer() {
  return (
    <section className="py-8 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-yellow-700 mb-2">
                Time-Sensitive Travel Notice
              </h3>
              <p className="text-neutral-700 mb-2">
                OyeGaadi does not encourage booking for flights, exams, or urgent time-bound events. 
                While our drivers strive for punctuality, road conditions and other factors may cause delays.
              </p>
              <p className="text-sm text-neutral-600">
                For time-critical travel, please consider dedicated services with guaranteed arrival times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
