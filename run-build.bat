@echo off
if exist "C:\Users\YUVARAJ KHOT\AppData\Local\electron-builder\Cache\nsis\472290619" (
  move "C:\Users\YUVARAJ KHOT\AppData\Local\electron-builder\Cache\nsis\472290619" "C:\Users\YUVARAJ KHOT\AppData\Local\electron-builder\Cache\nsis\nsis-resources-3.4.1"
)
call build-electron-cmd.bat
