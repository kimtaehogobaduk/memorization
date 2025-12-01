import { Home, BookOpen, Users, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "홈" },
    { to: "/vocabularies", icon: BookOpen, label: "단어장" },
    { to: "/groups", icon: Users, label: "그룹" },
    { to: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-6 h-6", isActive && "stroke-2")} />
                  <span className="text-xs mt-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
