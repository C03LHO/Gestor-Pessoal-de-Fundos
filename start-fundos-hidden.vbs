' Executa start-fundos.bat em janela oculta (usado pela Task Scheduler no boot)
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
pasta = fs.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c """ & pasta & "\start-fundos.bat""", 0, False
