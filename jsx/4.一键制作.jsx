// 删除所有标记
var markers = app.activeDocument.markers;
var newDefs = [];
var filePath = app.activeDocument.path;
var wavname = app.activeDocument.displayName;
var dirPath = filePath.split('\\').slice(0, -1).join('\\');
// 新增CSV读取逻辑
var csvFile = new File(dirPath + "/transcriptions.csv");
var newname = [];


if (csvFile.exists) {
    csvFile.open("r");
    var csvContent = csvFile.read();
    csvFile.close();
    
    // 解析CSV内容[6,7](@ref)
    var lines = csvContent.split("\n");
    var headers = lines[0].split(",");
                
    for (var i = 1; i < lines.length; i++) {
        var row = lines[i].split(",");   
        if (row[0] === wavname) {
            $.writeln (row[1])
            // 获取ph_seq并分割为数组[3,8](@ref)
            newname = row[1].split(" ");

            break;
        }
    }
}

// 错误处理
if (newname.length === 0) {
    alert("未在CSV中找到匹配的音素序列", "错误");
}

if (markers.length != newname.length) {
    alert("音素数量：" + newname.length + " 标记数量：" + markers.length, '音素数量不匹配');
}

// 标记重命名逻辑（保持原有）
for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    var def = {
        start: m.start,
        duration: m.length,
        name: (i < newname.length) ? newname[i] : m.name,
        type: m.type,
        description: m.description
    };
    newDefs.push(def);
};

// 删除并重建标记（保持原有）
if (app.invokeCommand(Application.COMMAND_EDIT_DELETEALLMARKERS)) {
    $.writeln('删除所有标记');
}

for (var k = 0; k < newDefs.length; k++) {
    var d = newDefs[k];
    app.activeDocument.addMarker(d.start, d.duration, d.name, d.type);
}



//读取并写入标记
var markers = app.activeDocument.markers;
var textgridDir = new Folder(dirPath + "/TextGrid");
if (!textgridDir.exists) {
    textgridDir.create(); // 自动创建目录[6,9,10](@ref)
}
var textgridFile = new File(textgridDir.fsName + "/" + wavname + ".TextGrid");
var sampleRate = app.activeDocument.sampleRate;
var duration = app.activeDocument.duration;
var xmin = 0;
var xmax = duration/sampleRate;

// 构建内容字符串（注意换行符和引号闭合）
var content = 
  'File type = "ooTextFile"\n' +
  'Object class = "TextGrid"\n\n' +
  'xmin = 0\n' +
  'xmax = ' + xmax + '\n' + // 限制小数点后15位
  'tiers? <exists>\n' +
  'size = 2\n' +
  'item []:\n' +
  '\titem [1]:\n'+
  '\t\tclass = "IntervalTier"'+'\n'+
  '\t\tname = "words"'+'\n'+
    '\t\txmin = 0\n' +
  '\t\txmax = ' + xmax + '\n' + // 限制小数点后15位
  '\t\tintervals: size = 1\n'+
  '\t\t\t\intervals [1]:'+'\n'+
  '\t\t\t\txmin = 0\n'+
  '\t\t\t\txmax = '+ xmax + '\n' +
  '\t\t\t\ttext = "SP"\n'+
  '\titem [2]:\n'+
    '\t\tclass = "IntervalTier"'+'\n'+
  '\t\tname = "phones"'+'\n'+
    '\t\txmin = 0\n' +
  '\t\txmax = ' + xmax + '\n' + // 限制小数点后15位
    '\t\tintervals: size = '+(markers.length+1)+'\n'+
      '\t\t\t\intervals [1]:'+'\n'+
  '\t\t\t\txmin = 0\n'+
  '\t\t\t\txmax = '+ (markers[0].start/sampleRate)+ '\n' +
  '\t\t\t\ttext = "SP"\n'
  ; 
var intervals = 2;



// 强制以 UTF-8 编码写入（避免乱码问题）
textgridFile.encoding = "UTF-8";
textgridFile.lineFeed = "Unix"; // 统一换行符类型

// 写入操作（需处理文件访问异常）
if (textgridFile.open("w")) { // "w" 表示写入模式
  try {
    textgridFile.write(content);
    for (var i = 0; i < markers.length-1; i++) {
    content = '\t\t\t\intervals ['+intervals+']:\n'+ '\t\t\t\txmin = '+(markers[i].start/sampleRate)+ '\n'+'\t\t\t\txmax = '+ (markers[i+1].start/sampleRate)+ '\n' +'\t\t\t\ttext = "'+markers[i].name+'"\n';
    textgridFile.write(content);
    intervals+=1;
};
    content = '\t\t\t\intervals ['+(intervals)+']:\n'+ '\t\t\t\txmin = '+(markers[markers.length-1].start/sampleRate)+ '\n'+'\t\t\t\txmax = '+xmax+ '\n' +'\t\t\t\ttext = "'+markers[markers.length-1].name+'"\n';
    textgridFile.write(content)
    textgridFile.close();
    alert("TextGrid 文件已成功生成");
  } catch (e) {
    alert("写入失败: " + e.message);
  }
} else {
  alert("无法创建文件，请检查路径权限");
}
    

