import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * LoginForm Component
 *
 * Clean login form using new auth system (lib/auth.ts).
 * UI pattern referenced from old AuthScreen.tsx but written from scratch.
 */
import { useState } from 'react';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
export default function LoginForm({ onSuccess }) {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const { data, error: loginError } = await signIn({
                email: credentials.email,
                password: credentials.password,
            });
            if (loginError) {
                setError(loginError.message);
                setIsLoading(false);
                return;
            }
            if (data) {
                console.log('Login successful:', data.email);
                onSuccess();
            }
        }
        catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occurred');
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6", children: _jsxs(Card, { className: "w-full max-w-md shadow-lg", children: [_jsxs(CardHeader, { className: "text-center", children: [_jsx(CardTitle, { className: "text-3xl font-bold", children: "MinRisk" }), _jsx(CardDescription, { children: "Enterprise Risk Management Platform" })] }), _jsxs(CardContent, { children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded", children: error })), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", placeholder: "your.email@company.com", value: credentials.email, onChange: (e) => setCredentials({ ...credentials, email: e.target.value }), required: true, disabled: isLoading })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Password" }), _jsx(Input, { id: "password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: credentials.password, onChange: (e) => setCredentials({ ...credentials, password: e.target.value }), required: true, disabled: isLoading })] }), _jsx(Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? 'Signing in...' : 'Sign In' })] }), _jsxs("div", { className: "mt-6 text-center text-sm text-gray-600", children: [_jsx("p", { children: "MinRisk - Version 2.0" }), _jsx("p", { className: "text-xs mt-1", children: "Clean rebuild with new auth system" })] })] })] }) }));
}
