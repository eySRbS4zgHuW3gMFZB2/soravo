; NSIS Installer for Soravo Desktop
!include MUI2.nsh

; Modern UI 2 Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Branding
Name "Soravo"
OutFile "..\bundle\nsis\Soravo-setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Soravo"
InstallDirRegKey HKLM "SOFTWARE\Soravo" "InstallDir"

; Pages
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Language
!insertmacro MUI_LANGUAGE "English"

; Section
Section "Soravo"
  SetOutPath "$INSTDIR"
  
  ; Copy application files
  File "..\target\release\soravo-desktop.exe"
  File "..\target\release\tauri.exe"
  
  ; Create Start Menu Shortcut
  CreateDirectory "$SMPROGRAMS\Soravo"
  CreateShortcut "$SMPROGRAMS\Soravo\Soravo.lnk" "$INSTDIR\soravo-desktop.exe"
  
  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\Soravo.lnk" "$INSTDIR\soravo-desktop.exe"
  
  ; Register uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Registry entries
  WriteRegStr HKLM "SOFTWARE\Soravo" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\Soravo" "Version" "${VERSION}"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\Soravo\Soravo.lnk"
  RMDir "$SMPROGRAMS\Soravo"
  Delete "$DESKTOP\Soravo.lnk"
  DeleteRegKey HKLM "SOFTWARE\Soravo"
SectionEnd
