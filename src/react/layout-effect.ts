import { useEffect, useLayoutEffect } from "react";

// 서버 HTML에는 측정이 없으며, 브라우저에서는 기존 paint 이전 측정·정리를 유지한다.
export const useCominsLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;
