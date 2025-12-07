!include "FileFunc.nsh"
!insertmacro GetParent

!define DATA_FOLDER_NAME "D-json-data"
!define DOWNLOAD_FOLDER_NAME "D-downloads"
!define LEGACY_DATA_FOLDER_NAME "json-data"
!define LEGACY_DOWNLOAD_FOLDER_NAME "downloads"
!define LOCAL_STORAGE_FOLDER_NAME "LocalStorage"
!define LOCAL_STORAGE_LEGACY_FOLDER_NAME "Local Storage"
!define DATA_CONFIG_FILE "data-path.txt"
!define DOWNLOAD_CONFIG_FILE "download-path.txt"

Var DataConfigPath
Var DownloadConfigPath
Var SelectedDataDir
Var SelectedDownloadDir
Var InstallParentDir
!ifdef BUILD_UNINSTALLER
Var PreserveTempRoot
Var PreserveDataTemp
Var PreserveDownloadTemp
!endif

; 允许根目录安装，避免安装按钮被禁用
AllowRootDirInstall true

!macro SetAppDataConfigPaths
  SetShellVarContext current
  StrCpy $DataConfigPath "$APPDATA\${PRODUCT_NAME}\${DATA_CONFIG_FILE}"
  StrCpy $DownloadConfigPath "$APPDATA\${PRODUCT_NAME}\${DOWNLOAD_CONFIG_FILE}"
!macroend

!macro DetermineInstallParentDir
  Push $R0
  Push $R1
  ${GetParent} "$INSTDIR" $InstallParentDir
  ${If} $InstallParentDir == ""
    StrCpy $InstallParentDir "$INSTDIR"
  ${EndIf}
  StrLen $R0 $InstallParentDir
  ${If} $R0 > 1
    StrCpy $R1 $InstallParentDir 1 -1
    ${If} $R1 == "\"
      StrCpy $InstallParentDir $InstallParentDir -1
    ${EndIf}
  ${EndIf}
  Pop $R1
  Pop $R0
!macroend

!macro preInit
  !insertmacro SetAppDataConfigPaths
  StrCpy $SelectedDataDir ""
  StrCpy $SelectedDownloadDir ""
!macroend

!macro customInit
  ; no custom UI initialization required
!macroend

!macro customPageAfterChangeDir
  ; keep hook for electron-builder but no extra page is inserted
!macroend

!macro customInstall
  !insertmacro SetAppDataConfigPaths
  !insertmacro DetermineInstallParentDir

  CreateDirectory "$InstallParentDir"

  StrCpy $SelectedDataDir "$InstallParentDir\${DATA_FOLDER_NAME}"
  StrCpy $SelectedDownloadDir "$InstallParentDir\${DOWNLOAD_FOLDER_NAME}"

  CreateDirectory "$SelectedDataDir"
  CreateDirectory "$SelectedDownloadDir"
  CreateDirectory "$APPDATA\${PRODUCT_NAME}"

  FileOpen $0 "$DataConfigPath" w
  FileWrite $0 "$SelectedDataDir"
  FileClose $0

  FileOpen $1 "$DownloadConfigPath" w
  FileWrite $1 "$SelectedDownloadDir"
  FileClose $1
!macroend

!ifdef BUILD_UNINSTALLER
!macro customRemoveFiles
  StrCpy $PreserveTempRoot "$PLUGINSDIR\preserve-user-data"
  StrCpy $PreserveDataTemp "$PreserveTempRoot\${DATA_FOLDER_NAME}"
  StrCpy $PreserveDownloadTemp "$PreserveTempRoot\${DOWNLOAD_FOLDER_NAME}"

  RMDir /r "$PreserveTempRoot"
  CreateDirectory "$PreserveTempRoot"

  ${If} ${FileExists} "$INSTDIR\${DATA_FOLDER_NAME}"
    RMDir /r "$PreserveDataTemp"
    Rename "$INSTDIR\${DATA_FOLDER_NAME}" "$PreserveDataTemp"
  ${ElseIf} ${FileExists} "$INSTDIR\${LEGACY_DATA_FOLDER_NAME}"
    RMDir /r "$PreserveDataTemp"
    Rename "$INSTDIR\${LEGACY_DATA_FOLDER_NAME}" "$PreserveDataTemp"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"
    RMDir /r "$PreserveDownloadTemp"
    Rename "$INSTDIR\${DOWNLOAD_FOLDER_NAME}" "$PreserveDownloadTemp"
  ${ElseIf} ${FileExists} "$INSTDIR\${LEGACY_DOWNLOAD_FOLDER_NAME}"
    RMDir /r "$PreserveDownloadTemp"
    Rename "$INSTDIR\${LEGACY_DOWNLOAD_FOLDER_NAME}" "$PreserveDownloadTemp"
  ${EndIf}

  ${if} ${isUpdated}
    CreateDirectory "$PLUGINSDIR\old-install"

    Push ""
    Call un.atomicRMDir
    Pop $R0

    ${if} $R0 != 0
      DetailPrint "File is busy, aborting: $R0"

      Push ""
      Call un.restoreFiles
      Pop $R0

      Abort `Can't rename "$INSTDIR" to "$PLUGINSDIR\old-install".`
    ${endif}
  ${endif}

  RMDir /r $INSTDIR

  ${If} ${FileExists} "$PreserveDataTemp"
    CreateDirectory "$INSTDIR"
    Rename "$PreserveDataTemp" "$INSTDIR\${DATA_FOLDER_NAME}"
  ${EndIf}

  ${If} ${FileExists} "$PreserveDownloadTemp"
    CreateDirectory "$INSTDIR"
    Rename "$PreserveDownloadTemp" "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"
  ${EndIf}

  RMDir /r "$PreserveTempRoot"
!macroend
!endif

!macro customUnInstall
  !insertmacro SetAppDataConfigPaths
  !insertmacro DetermineInstallParentDir

  StrCpy $SelectedDataDir ""
  StrCpy $SelectedDownloadDir ""

  ${If} ${FileExists} "$DataConfigPath"
    FileOpen $0 "$DataConfigPath" r
    FileRead $0 $SelectedDataDir
    FileClose $0
  ${EndIf}

  ${If} ${FileExists} "$DownloadConfigPath"
    FileOpen $1 "$DownloadConfigPath" r
    FileRead $1 $SelectedDownloadDir
    FileClose $1
  ${EndIf}

  ${If} $SelectedDataDir == ""
    StrCpy $SelectedDataDir "$InstallParentDir\${DATA_FOLDER_NAME}"
  ${EndIf}

  ${If} ${FileExists} "$SelectedDataDir"
  ${Else}
    ${If} ${FileExists} "$InstallParentDir\${LEGACY_DATA_FOLDER_NAME}"
      StrCpy $SelectedDataDir "$InstallParentDir\${LEGACY_DATA_FOLDER_NAME}"
    ${ElseIf} ${FileExists} "$INSTDIR\${DATA_FOLDER_NAME}"
      StrCpy $SelectedDataDir "$INSTDIR\${DATA_FOLDER_NAME}"
    ${ElseIf} ${FileExists} "$INSTDIR\${LEGACY_DATA_FOLDER_NAME}"
      StrCpy $SelectedDataDir "$INSTDIR\${LEGACY_DATA_FOLDER_NAME}"
    ${EndIf}
  ${EndIf}

  ${If} $SelectedDownloadDir == ""
    StrCpy $SelectedDownloadDir "$InstallParentDir\${DOWNLOAD_FOLDER_NAME}"
  ${EndIf}

  ${If} ${FileExists} "$SelectedDownloadDir"
  ${Else}
    ${If} ${FileExists} "$InstallParentDir\${LEGACY_DOWNLOAD_FOLDER_NAME}"
      StrCpy $SelectedDownloadDir "$InstallParentDir\${LEGACY_DOWNLOAD_FOLDER_NAME}"
    ${ElseIf} ${FileExists} "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"
      StrCpy $SelectedDownloadDir "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"
    ${ElseIf} ${FileExists} "$INSTDIR\${LEGACY_DOWNLOAD_FOLDER_NAME}"
      StrCpy $SelectedDownloadDir "$INSTDIR\${LEGACY_DOWNLOAD_FOLDER_NAME}"
    ${EndIf}
  ${EndIf}

  ${If} $SelectedDataDir != ""
    IfSilent skipDeleteData
    MessageBox MB_ICONQUESTION|MB_YESNO "是否要删除爬取数据 json 文件？$\n$SelectedDataDir" IDNO skipDeleteData
    RMDir /r "$SelectedDataDir"
    skipDeleteData:
  ${EndIf}

  ${If} $SelectedDownloadDir != ""
    IfSilent skipDeleteDownload
    MessageBox MB_ICONQUESTION|MB_YESNO "是否要删除下载论文文件？$\n$SelectedDownloadDir" IDNO skipDeleteDownload
    RMDir /r "$SelectedDownloadDir"
    skipDeleteDownload:
  ${EndIf}

  Delete "$DataConfigPath"
  Delete "$DownloadConfigPath"

  ${If} ${FileExists} "$APPDATA\${PRODUCT_NAME}\${LOCAL_STORAGE_FOLDER_NAME}"
    RMDir /r "$APPDATA\${PRODUCT_NAME}\${LOCAL_STORAGE_FOLDER_NAME}"
  ${EndIf}

  ${If} ${FileExists} "$APPDATA\${PRODUCT_NAME}\${LOCAL_STORAGE_LEGACY_FOLDER_NAME}"
    RMDir /r "$APPDATA\${PRODUCT_NAME}\${LOCAL_STORAGE_LEGACY_FOLDER_NAME}"
  ${EndIf}
!macroend

