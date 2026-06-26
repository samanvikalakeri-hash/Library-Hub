import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, CheckCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type Notification = {
  id: number;
  studentId: number;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length ?? 0;
}

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast({ title: "Could not mark all as read", variant: "destructive" }),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7" /> Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Updates about your reservations and library activity.
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg border bg-card">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : notifications?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No notifications yet</h3>
            <p className="text-sm">You'll be notified when your reservations are confirmed.</p>
          </div>
        ) : (
          notifications?.map((n) => (
            <div
              key={n.id}
              className={`flex gap-4 p-4 rounded-lg border transition-colors ${
                n.read ? "bg-card text-muted-foreground" : "bg-card border-teal-200 shadow-sm"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {n.type === "success" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : n.type === "warning" ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <Info className="h-6 w-6 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.read ? "" : "text-foreground font-medium"}`}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(n.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {!n.read && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-teal-500 inline-block" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => markOneRead.mutate(n.id)}
                      disabled={markOneRead.isPending}
                    >
                      Mark read
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
