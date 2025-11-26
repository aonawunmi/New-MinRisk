import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
    const variantClass = variant === "destructive"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-gray-200 bg-white";
    return (_jsx("div", { ref: ref, role: "alert", className: `relative w-full rounded-lg border p-4 ${variantClass} ${className || ''}`, ...props }));
});
Alert.displayName = "Alert";
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: `text-sm ${className || ''}`, ...props })));
AlertDescription.displayName = "AlertDescription";
export { Alert, AlertDescription };
