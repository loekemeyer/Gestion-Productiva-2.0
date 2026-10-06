Attribute VB_Name = "GV_ListaPrecios"
' ============================================================================
' Idea 7358 - Macro de "A Costos VIGENTES": sube la hoja "Lista de Precios " a
' Supabase (GP2.lista_precios_subir) y la base avisa al grupo LK Gerencia por
' Telegram cada cambio de precio (aumentos/bajas/nuevos/sacados/corrimientos).
'
' COMO SE USA:
'   1) Alt+F11 (editor VBA) -> Insertar -> Modulo -> pegar TODO este codigo.
'   2) Completar las 3 constantes de abajo (EMAIL/PASSWORD de una cuenta de
'      COMPRAS habilitada en GP2 - la misma whitelist que entra al login de GP2).
'   3) Guardar el Excel como .xlsm (habilitado para macros).
'   4) Para que suba sola al guardar: en "ThisWorkbook" pegar
'        Private Sub Workbook_BeforeSave(ByVal SaveAsUI As Boolean, Cancel As Boolean)
'            On Error Resume Next
'            SubirListaPrecios
'        End Sub
'      O correrla a mano con Alt+F8 -> SubirListaPrecios.
'
' SEGURIDAD: usa la clave PUBLICABLE (sb_publishable, es publica) + login de una
' cuenta de compras. NUNCA poner aca la service_role / sb_secret: con la clave
' publica + login, un tercero que robe el archivo solo tiene esa cuenta de
' compras, no toda la base. La RPC exige sesion autorizada (GP2._exigir_autorizado).
' ============================================================================

Private Const SB_URL   As String = "https://hrxfctzncixxqmpfhskv.supabase.co"
Private Const SB_APIKEY As String = "sb_publishable_BqpAgZH6ty-9wft10_YMhw_0rcIPuWT"
Private Const SB_EMAIL  As String = "COMPLETAR_EMAIL_DE_COMPRAS"   ' <-- cuenta habilitada en GP2
Private Const SB_PASS   As String = "COMPLETAR_PASSWORD"            ' <-- su password
Private Const HOJA      As String = "Lista de Precios "            ' ojo: termina en espacio
Private Const CELDA_DOLAR As String = "H3"                         ' $H$3 = dolar
Private Const ULTIMA_COL As Long = 16                              ' A..P

Public Sub SubirListaPrecios()
    Dim ws As Worksheet, token As String, body As String, resp As String
    Dim dolar As String

    On Error GoTo fallo
    Set ws = ThisWorkbook.Worksheets(HOJA)

    ' 1) login -> access_token
    token = SbLogin()
    If token = "" Then
        MsgBox "No se pudo entrar a Supabase (revisar EMAIL/PASSWORD de compras).", vbExclamation
        Exit Sub
    End If

    ' 2) armar el JSON de la hoja
    dolar = NumAr(ws.Range(CELDA_DOLAR).Value2)
    body = "{""p_filas"":{""" & JsonEsc(HOJA) & """:" & FilasJson(ws) & "}" & _
           ",""p_subido_por"":""" & JsonEsc(Environ$("USERNAME")) & """"
    If dolar <> "" Then body = body & ",""p_dolar"":" & dolar
    body = body & "}"

    ' 3) POST a la RPC
    resp = SbPost("/rest/v1/rpc/lista_precios_subir", token, body)

    If InStr(resp, """ok"":true") > 0 Then
        MsgBox "Lista de Precios subida. La base avisa los cambios por Telegram si los hay." & _
               vbCrLf & resp, vbInformation
    Else
        MsgBox "Respuesta inesperada de Supabase:" & vbCrLf & resp, vbExclamation
    End If
    Exit Sub
fallo:
    MsgBox "Error al subir la Lista de Precios: " & Err.Description, vbCritical
End Sub

' ---- login: devuelve el access_token o "" ----
Private Function SbLogin() As String
    Dim http As Object, body As String
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    body = "{""email"":""" & JsonEsc(SB_EMAIL) & """,""password"":""" & JsonEsc(SB_PASS) & """}"
    http.Open "POST", SB_URL & "/auth/v1/token?grant_type=password", False
    http.setRequestHeader "apikey", SB_APIKEY
    http.setRequestHeader "Content-Type", "application/json"
    http.send body
    If http.Status = 200 Then
        SbLogin = JsonStr(http.responseText, "access_token")
    Else
        SbLogin = ""
    End If
End Function

' ---- POST autenticado ----
Private Function SbPost(path As String, token As String, body As String) As String
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", SB_URL & path, False
    http.setRequestHeader "apikey", SB_APIKEY
    http.setRequestHeader "Authorization", "Bearer " & token
    http.setRequestHeader "Content-Type", "application/json"
    http.send body
    SbPost = http.responseText
End Function

' ---- arma [[fila,{celdas},null,null], ...] con las filas que tienen algo en A..P ----
Private Function FilasJson(ws As Worksheet) As String
    Dim ultFila As Long, r As Long, c As Long, sb As String, celdas As String
    Dim v As Variant, col As String, txt As String, hayA As Boolean, primeraFila As Boolean

    ultFila = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    ' por si la col A tiene huecos, tomar la ultima fila usada de toda la banda A..P
    Dim rr As Long
    For c = 1 To ULTIMA_COL
        rr = ws.Cells(ws.Rows.Count, c).End(xlUp).Row
        If rr > ultFila Then ultFila = rr
    Next c

    sb = "["
    primeraFila = True
    For r = 1 To ultFila
        celdas = ""
        For c = 1 To ULTIMA_COL
            v = ws.Cells(r, c).Value2
            If Not IsEmpty(v) And Len(Trim$(CStr(v))) > 0 Then
                col = Chr$(64 + c)                         ' 1->A ... 16->P
                txt = CeldaTxt(ws.Cells(r, c), col)
                If Len(txt) > 0 Then
                    If Len(celdas) > 0 Then celdas = celdas & ","
                    celdas = celdas & """" & col & """:""" & JsonEsc(txt) & """"
                End If
            End If
        Next c
        If Len(celdas) > 0 Then
            If Not primeraFila Then sb = sb & ","
            sb = sb & "[" & r & ",{" & celdas & "},null,null]"
            primeraFila = False
        End If
    Next r
    FilasJson = sb & "]"
End Function

' ---- texto de una celda segun la columna (fechas I/N ISO; numeros con punto) ----
Private Function CeldaTxt(celda As Range, col As String) As String
    Dim v As Variant
    v = celda.Value2
    If (col = "I" Or col = "N") And IsDate(celda.Value) Then
        CeldaTxt = Format$(celda.Value, "yyyy-mm-dd")
    ElseIf IsNumeric(v) And Len(celda.Text) > 0 And Not IsDate(celda.Value) Then
        CeldaTxt = NumAr(v)
    Else
        CeldaTxt = CStr(celda.Value)                       ' texto visible
    End If
End Function

' ---- numero -> texto con PUNTO decimal (planilla_num espera ^-?[0-9]+(\.[0-9]+)?$) ----
Private Function NumAr(v As Variant) As String
    Dim s As String
    If Not IsNumeric(v) Then NumAr = "": Exit Function
    s = CStr(v)                 ' en AR CStr usa coma como decimal
    s = Replace(s, ".", "")     ' saca separador de miles si lo hubiera
    s = Replace(s, ",", ".")    ' coma decimal -> punto
    NumAr = s
End Function

' ---- escape JSON ----
Private Function JsonEsc(s As String) As String
    Dim t As String
    t = Replace(s, "\", "\\")
    t = Replace(t, """", "\""")
    t = Replace(t, vbCrLf, "\n")
    t = Replace(t, vbCr, "\n")
    t = Replace(t, vbLf, "\n")
    t = Replace(t, vbTab, "\t")
    JsonEsc = t
End Function

' ---- extrae el valor string de una clave de un JSON plano ----
Private Function JsonStr(json As String, clave As String) As String
    Dim p As Long, q As Long, ini As Long
    p = InStr(json, """" & clave & """")
    If p = 0 Then JsonStr = "": Exit Function
    p = InStr(p, json, ":")
    If p = 0 Then JsonStr = "": Exit Function
    ini = InStr(p, json, """")
    If ini = 0 Then JsonStr = "": Exit Function
    q = InStr(ini + 1, json, """")
    Do While q > 0
        If Mid$(json, q - 1, 1) <> "\" Then Exit Do
        q = InStr(q + 1, json, """")
    Loop
    JsonStr = Mid$(json, ini + 1, q - ini - 1)
End Function
