package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Home screen widget: the airline's balance, your next flight and how many aircraft are in the air.
 * The app writes the figures (AppTools.widget) whenever they change; tapping the widget opens the app.
 */
public class StatusWidget extends AppWidgetProvider {
    static final String PREFS = "amp_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) draw(ctx, mgr, id);
    }

    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, StatusWidget.class));
        for (int id : ids) draw(ctx, mgr, id);
    }

    static void draw(Context ctx, AppWidgetManager mgr, int id) {
        String pkg = ctx.getPackageName();
        int layout = ctx.getResources().getIdentifier("amp_widget", "layout", pkg);
        if (layout == 0) return;
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(pkg, layout);
        v.setTextViewText(ctx.getResources().getIdentifier("w_title", "id", pkg), p.getString("title", "Airline Manager Pro"));
        v.setTextViewText(ctx.getResources().getIdentifier("w_balance", "id", pkg), p.getString("balance", "Open the app"));
        v.setTextViewText(ctx.getResources().getIdentifier("w_next", "id", pkg), p.getString("next", ""));
        v.setTextViewText(ctx.getResources().getIdentifier("w_flying", "id", pkg), p.getString("flying", ""));
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        v.setOnClickPendingIntent(ctx.getResources().getIdentifier("w_root", "id", pkg), PendingIntent.getActivity(ctx, 0, open, flags));
        mgr.updateAppWidget(id, v);
    }
}
