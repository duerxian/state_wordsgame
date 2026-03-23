@echo off
echo 正在安装依赖包...
python -m pip install --upgrade pip
pip install flask==2.3.0
pip install flask-cors==4.0.0
pip install pandas==2.0.3
pip install openpyxl==3.1.2
echo.
echo 安装完成！
pause
