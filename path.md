## Problems/Caveats

Need to run in admin mode


## Install Android SDK
It needs to accept some EULA thingy so it might be difficult to run as command
https://developer.android.com/studio#command-line-tools-only

Download a zip -> need to be extracted
```ps
Expand-Archive F:\dwld_opera\commandlinetools-win-11076708_latest.zip -DestinationPath C:\ProgramFiles\Android\sdk
```


change the path tree to this

```md
Path to unzipped sdk/
└── Android/
    └── sdk/
        └── cmd-line-tools/
            └── tools/
                ├── bin/
                │   ├── sdkmanager
                │   └── avdmanager
                ├── lib
                ├── NOTICE.txt
                └── source.properties
```

need this -> modify the images based on needs 
```ps
.\sdkmanager.bat "system-images;android-30;google_apis_playstore;x86"
```
it will ask for a yes/no to accept EULA

```ps
.\avdmanager.bat create avd -n test -k "system-images;android-35;google_apis_playstore;x86_64"
```
create the emulator

go to this folder
```ps
C:\ProgramFiles\Android\sdk\emulator
```
run the emu
```ps
.\emulator.exe -avd test
```

seems to be missing the sdk path to ENV


## BETTER OPTION
Install SDK from Android studio (remember to install cmdline tools)

