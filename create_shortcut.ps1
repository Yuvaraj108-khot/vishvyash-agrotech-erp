$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\YUVARAJ KHOT\Desktop\Vishvyash ERP.lnk")
$Shortcut.TargetPath = "C:\Users\YUVARAJ KHOT\my files\Desktop\vishvyash-agrotech-erp\electron\dist\win-unpacked\Vishvyash ERP.exe"
$Shortcut.WorkingDirectory = "C:\Users\YUVARAJ KHOT\my files\Desktop\vishvyash-agrotech-erp\electron\dist\win-unpacked"
$Shortcut.Save()
