import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Preferência de exibição das legendas de ajuda (tooltips e botões "?").
// Desligar esconde só as legendas VISUAIS: as descrições continuam ligadas
// aos campos por aria-describedby, então os leitores de tela sempre as
// recebem. A escolha fica salva só neste navegador.

const STORAGE_KEY = "a11y-help-tips";

type HelpTipsContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

const HelpTipsContext = createContext<HelpTipsContextValue>({
  visible: true,
  setVisible: () => {},
});

function readStoredPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function HelpTipsProvider({ children }: { children: ReactNode }) {
  const [visible, setVisibleState] = useState(readStoredPreference);

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Navegação privada ou armazenamento bloqueado: vale só nesta visita.
    }
  }, []);

  const value = useMemo(() => ({ visible, setVisible }), [visible, setVisible]);

  return <HelpTipsContext.Provider value={value}>{children}</HelpTipsContext.Provider>;
}

export function useHelpTips() {
  return useContext(HelpTipsContext);
}
