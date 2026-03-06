import { Loader2, AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    onCancel: () => void
    isLoading?: boolean
    variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
                    iconBg: 'bg-red-100',
                    button: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                }
            case 'warning':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
                    iconBg: 'bg-yellow-100',
                    button: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
                }
            case 'info':
            default:
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
                    iconBg: 'bg-blue-100',
                    button: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                }
        }
    }

    const styles = getVariantStyles()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex justify-between items-start p-4 bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${styles.iconBg}`}>
                            {styles.icon}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-500 transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600">{message}</p>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${styles.button}`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
