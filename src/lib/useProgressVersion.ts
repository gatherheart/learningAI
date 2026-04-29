import { useEffect, useState } from "react";

const EVENT_NAME = "learningAI:progress";

export function useProgressVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function onChange() {
      setVersion((current) => current + 1);
    }

    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return version;
}
