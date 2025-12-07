!define DATA_FOLDER_NAME "json-data"
!define DOWNLOAD_FOLDER_NAME "downloads"
!define LOCAL_STORAGE_FOLDER_NAME "LocalStorage"
!define LOCAL_STORAGE_LEGACY_FOLDER_NAME "Local Storage"
!define DATA_CONFIG_FILE "data-path.txt"
!define DOWNLOAD_CONFIG_FILE "download-path.txt"

Var DataConfigPath
Var DownloadConfigPath
Var SelectedDataDir
Var SelectedDownloadDir

; 允许根目录安装，避免安装按钮被禁用
AllowRootDirInstall true

!macro SetAppDataConfigPaths
  SetShellVarContext current
  StrCpy $DataConfigPath "$APPDATA\${PRODUCT_NAME}\${DATA_CONFIG_FILE}"
  StrCpy $DownloadConfigPath "$APPDATA\${PRODUCT_NAME}\${DOWNLOAD_CONFIG_FILE}"
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

  StrCpy $SelectedDataDir "$INSTDIR\${DATA_FOLDER_NAME}"
  StrCpy $SelectedDownloadDir "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"

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

!macro customUnInstall
  !insertmacro SetAppDataConfigPaths

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
    StrCpy $SelectedDataDir "$INSTDIR\${DATA_FOLDER_NAME}"
  ${EndIf}

  ${If} $SelectedDownloadDir == ""
    StrCpy $SelectedDownloadDir "$INSTDIR\${DOWNLOAD_FOLDER_NAME}"
  ${EndIf}

  ${If} $SelectedDataDir != ""
    MessageBox MB_ICONQUESTION|MB_YESNO "是否要删除爬取数据 json 文件？$\n$SelectedDataDir" IDNO skipDeleteData
    RMDir /r "$SelectedDataDir"
    skipDeleteData:
  ${EndIf}

  ${If} $SelectedDownloadDir != ""
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

