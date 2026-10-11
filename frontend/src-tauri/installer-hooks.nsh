!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec 'taskkill /F /IM "aerothrust-backend.exe"'
  nsExec::Exec 'taskkill /F /IM "aerothrust-backend-x86_64-pc-windows-msvc.exe"'
  nsExec::Exec 'taskkill /F /IM "AeroThrust V3.exe"'
  Sleep 1000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'taskkill /F /IM "aerothrust-backend.exe"'
  nsExec::Exec 'taskkill /F /IM "aerothrust-backend-x86_64-pc-windows-msvc.exe"'
  nsExec::Exec 'taskkill /F /IM "AeroThrust V3.exe"'
  Sleep 1000
!macroend