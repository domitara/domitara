# Keep kotlinx.serialization generated serializers.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**

-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
-keep class com.domitara.data.dto.** { *; }

# Retrofit
-keepattributes Signature, Exceptions
-dontwarn retrofit2.**
-keep,allowobfuscation interface <1>

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Room (used internally by WorkManager's WorkDatabase) instantiates its
# generated *_Impl classes via reflection (RoomDatabase.getGeneratedImplementation),
# so R8 can't see the constructor is used and strips it in minified release
# builds, crashing at startup with NoSuchMethodException: ..._Impl.<init>.
-keep class * extends androidx.room.RoomDatabase {
    <init>();
}
