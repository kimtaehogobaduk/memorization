import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLogo } from "./LogoProvider";

export const RotatingLogo = ({ onClick }: { onClick: () => void }) => {
  const logo = useLogo();
  const reducedMotion = useReducedMotion();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded p-0"
      onClick={onClick}
      aria-label="암기준섹 홈으로 이동"
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={logo}
          src={logo}
          alt="암기준섹 로고"
          className="absolute inset-0 h-10 w-10 object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.4 }}
        />
      </AnimatePresence>
    </Button>
  );
};