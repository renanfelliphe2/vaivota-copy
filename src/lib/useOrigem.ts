"use client";

import { useSyncExternalStore } from "react";

const semInscricao = () => () => {};

/** Origem do site (https://…) no navegador; vazio no servidor. Para montar links absolutos (QR Code, copiar link). */
export function useOrigem(): string {
  return useSyncExternalStore(semInscricao, () => window.location.origin, () => "");
}
