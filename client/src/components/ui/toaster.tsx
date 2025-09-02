import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { gtmEvent } from "@/components/integrations/gtm";


export function Toaster() {
  const { toasts } = useToast()


  if(toasts[0]?.title === "Booking successful"){
  gtmEvent('Booking successful', {
      page_location: window.location.href,
      id: toasts[0]?.id,
      title: toasts[0]?.title,
      description: toasts[0]?.description,
    });
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
