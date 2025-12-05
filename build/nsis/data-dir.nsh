!ifndef BUILD_UNINSTALLER
Var DataDirPageHandle
Var DataDirInputHandle
Var DataDirBrowseButtonHandle
!endif
Var SelectedDataDir
Var DataConfigPath

!define DATA_FOLDER_NAME "data"

!ifdef BUILD_UNINSTALLER
  !define EnsureDataFolderSuffixFunc "un.EnsureDataFolderSuffix"
!else
  !define EnsureDataFolderSuffixFunc "EnsureDataFolderSuffix"
!endif

!include "nsDialogs.nsh"

!macro preInit
  StrCpy $DataConfigPath "$APPDATA\${PRODUCT_NAME}\data-path.txt"
  StrCpy $SelectedDataDir ""
!macroend

Function ${EnsureDataFolderSuffixFunc}
  Exch $0
  Push $1
  Push $2
  Push $3

  StrCpy $1 $0
  ${If} $1 == ""
    Goto efs_done
  ${EndIf}

efs_trim:
  StrCpy $2 $1 1 -1
  ${If} $2 == "\"
  ${OrIf} $2 == "/"
    StrCpy $1 $1 "" -1
    Goto efs_trim
  ${EndIf}

  StrLen $3 $1
  IntCmp $3 5 efs_checkSuffix efs_append efs_checkSuffix

efs_checkSuffix:
  StrCpy $2 $1 5 -5
  ${If} $2 == "\${DATA_FOLDER_NAME}"
  ${OrIf} $2 == "/${DATA_FOLDER_NAME}"
    StrCpy $0 $1
    Goto efs_done
  ${EndIf}

efs_append:
  StrCpy $0 "$1\${DATA_FOLDER_NAME}"

efs_done:
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

!macro customInit
  ${If} $SelectedDataDir == ""
    StrCpy $SelectedDataDir "$DOCUMENTS\DesignThesisRetrieval\data"
  ${EndIf}
  ${If} ${FileExists} "$DataConfigPath"
    FileOpen $0 "$DataConfigPath" r
    FileRead $0 $SelectedDataDir
    FileClose $0
  ${EndIf}
  ${If} $SelectedDataDir == ""
    StrCpy $SelectedDataDir "$DOCUMENTS\DesignThesisRetrieval\data"
  ${EndIf}
  Push $SelectedDataDir
  Call ${EnsureDataFolderSuffixFunc}
  Pop $SelectedDataDir
!macroend

!macro customPageAfterChangeDir
  !ifndef BUILD_UNINSTALLER
    Page custom DataDirPageShow DataDirPageLeave
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
Function DataDirPageShow
  nsDialogs::Create 1018
  Pop $DataDirPageHandle
  ${If} $DataDirPageHandle == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "请选择 data 文件夹存放路径，可直接使用默认位置。"
  Pop $0

  ${NSD_CreateDirRequest} 0 28u 75% 14u "$SelectedDataDir"
  Pop $DataDirInputHandle

  ${NSD_CreateButton} 80% 28u 20% 14u "自定义位置..."
  Pop $DataDirBrowseButtonHandle
  ${NSD_OnClick} $DataDirBrowseButtonHandle DataDirBrowseButtonClicked

  nsDialogs::Show
FunctionEnd

Function DataDirBrowseButtonClicked
  ${NSD_GetText} $DataDirInputHandle $0
  nsDialogs::SelectFolderDialog "请选择 data 文件夹路径" $0
  Pop $1
  ${If} $1 == error
    Return
  ${EndIf}
  StrCpy $SelectedDataDir $1
  Push $SelectedDataDir
  Call ${EnsureDataFolderSuffixFunc}
  Pop $SelectedDataDir
  ${NSD_SetText} $DataDirInputHandle $SelectedDataDir
FunctionEnd

Function DataDirPageLeave
  ${NSD_GetText} $DataDirInputHandle $SelectedDataDir
  Push $SelectedDataDir
  Call ${EnsureDataFolderSuffixFunc}
  Pop $SelectedDataDir
  ${If} $SelectedDataDir == ""
    MessageBox MB_ICONEXCLAMATION "请选择有效的 data 文件夹路径。"
    Abort
  ${EndIf}
FunctionEnd
!endif

!macro customInstall
  ${If} $SelectedDataDir == ""
    StrCpy $SelectedDataDir "$DOCUMENTS\DesignThesisRetrieval\data"
  ${EndIf}
  Push $SelectedDataDir
  Call ${EnsureDataFolderSuffixFunc}
  Pop $SelectedDataDir
  CreateDirectory "$SelectedDataDir"
  CreateDirectory "$APPDATA\${PRODUCT_NAME}"
  FileOpen $0 "$DataConfigPath" w
  FileWrite $0 "$SelectedDataDir"
  FileClose $0
!macroend

!macro customUnInstall
  StrCpy $SelectedDataDir ""
  ${If} ${FileExists} "$DataConfigPath"
    FileOpen $0 "$DataConfigPath" r
    FileRead $0 $SelectedDataDir
    FileClose $0
  ${EndIf}
  Push $SelectedDataDir
  Call ${EnsureDataFolderSuffixFunc}
  Pop $SelectedDataDir

  ${If} $SelectedDataDir != ""
    MessageBox MB_ICONQUESTION|MB_YESNO "是否要删除 data 文件夹相关数据？$\n$SelectedDataDir" IDNO skipDelete
    RMDir /r "$SelectedDataDir"
    skipDelete:
  ${EndIf}

  Delete "$DataConfigPath"
!macroend

