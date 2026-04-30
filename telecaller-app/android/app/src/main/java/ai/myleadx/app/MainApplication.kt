package ai.myleadx.app

import android.app.Application
import ai.myleadx.app.BuildConfig
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import ai.myleadx.app.callrecording.CallRecordingPackage
import ai.myleadx.app.calllog.CallLogPackage
import ai.myleadx.app.accessibility.AccessibilityPackage
import ai.myleadx.app.audioplayer.AudioPlayerPackage
import ai.myleadx.app.storage.StoragePermissionPackage
import ai.myleadx.app.upload.BackgroundUploadPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here
          add(CallRecordingPackage())
          add(CallLogPackage())
          add(AccessibilityPackage())
          add(AudioPlayerPackage())
          add(StoragePermissionPackage())
          add(BackgroundUploadPackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
