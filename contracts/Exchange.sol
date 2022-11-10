// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./Token.sol";

contract Exchange {
    address public feeAccount;
    uint256 public feePercent;

    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    uint256 public orderCount;

    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Trade(
        uint256 id,
        address filler,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address creator,
        uint256 timestamp
    );

    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function depositToken(address _token, uint256 _amount) public {
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(tokens[_token][msg.sender] >= _amount, 'Amount exceeds token balance');

        Token(_token).transfer(msg.sender, _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256) {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        require(balanceOf(_tokenGive, msg.sender) >= _amountGive, 'Tokens deposited are not enough');

        orderCount = orderCount + 1;
        orders[orderCount] = _Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );

        emit Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );
    }

    function cancelOrder(uint256 _id) public {
        _Order storage order = orders[_id];

        require(order.id == _id, "Order doesn't exist");
        require(order.user == msg.sender, 'Only the order maker can cancel the order');

        orderCancelled[_id] = true;

        emit Cancel(
            order.id,
            msg.sender,
            order.tokenGet,
            order.amountGet,
            order.tokenGive,
            order.amountGive,
            block.timestamp
        );
    }

    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount, 'Order does not exist');
        require(!orderFilled[_id], 'Order has been filled');
        require(!orderCancelled[_id], 'Order has been cancelled');

        _Order storage order = orders[_id];
        _trade(order.id, order.user, order.tokenGet, order.amountGet, order.tokenGive, order.amountGive);

        orderFilled[order.id] = true;
    }

    function _trade(
        uint256 _orderId,
        address _user,
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) internal {
        uint256 feeAmount = (_amountGet * feePercent) / 100;

        // Deduct amountGet + feeAmount from order filler
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender] - (_amountGet + feeAmount);

        // Give amountGet to order creator
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user] + _amountGet;

        // Give the feeAmount to feeAccount
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount] + feeAmount;

        // Deduct amountGive from order creator
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user] - _amountGive;

        // Give amountGive to order filler
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender] + _amountGive;

        emit Trade(
            _orderId,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            _user,
            block.timestamp
        );
    }
}