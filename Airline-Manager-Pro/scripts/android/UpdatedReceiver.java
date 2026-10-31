package __PACKAGE__;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/**
 * Right after an update has installed itself, Android sends this app MY_PACKAGE_REPLACED. The app opens
 * again by itself; where Android doesn't let an app open from the background, a notification does it with
 * one tap.
 */
public class UpdatedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (!Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try { ctx.startActivity(open); } catch (Exception e) { /* not allowed from the background */ }
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel("updates", "Updates", NotificationManager.IMPORTANCE_HIGH));
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            String ver = "";
            try { ver = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName; } catch (Exception e) { /* unknown */ }
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, "updates")
                .setSmallIcon(ctx.getApplicationInfo().icon)
                .setContentTitle("Updated" + (ver.isEmpty() ? "" : " to " + ver))
                .setContentText("Tap to open the app again.")
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(PendingIntent.getActivity(ctx, 7, open, flags));
            nm.notify(7107, b.build());
        } catch (Exception e) { /* notifications off */ }
    }
}
